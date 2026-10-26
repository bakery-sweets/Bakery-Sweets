import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import AdminHeader from "../components/AdminHeader";
import { adminOrdersApi } from "../../api/admin";
import { formatVND, formatDateTime, apiErrorMessage, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "../../utils/format";
import popup from "../../utils/popup";
import { useRealtimeEvent } from "../../realtime/useRealtime";
import "./OrderList.css";

const URGENT_WINDOW_MS = 2 * 60 * 60 * 1000;
const AUTO_REFRESH_MS = 30 * 1000;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// Đơn chưa xong và giờ hẹn lấy bánh trong vòng 2 tiếng tới (hoặc đã quá giờ)
const isUrgent = (o) =>
  !["Completed", "Cancelled"].includes(o.status) &&
  !!o.pickup_time &&
  new Date(o.pickup_time).getTime() - Date.now() <= URGENT_WINDOW_MS;

// Nút chuyển bước tiếp theo trong modal (server trả next_statuses theo bảng chuyển trạng thái hợp lệ)
const NEXT_STEP = {
  Processing: { label: "Tiếp Nhận & Chuẩn Bị", icon: "restaurant-outline" },
  Ready: { label: "Báo Sẵn Sàng Tại Quầy", icon: "bag-check-outline" },
  Completed: { label: "Hoàn Tất Giao Bánh", icon: "checkmark-done-outline" },
};

// Đơn không phải COD phải được xác nhận thanh toán trước khi hoàn tất; đơn COD tự đánh dấu đã thu tiền
const needsPaymentFirst = (o) => o.payment_status !== "Paid" && o.payment_method !== "COD";

// Trạng thái thanh toán hiện thẳng bằng badge (tablet không có hover nên không dựa vào tooltip)
const PAYMENT_BADGE = {
  Paid: { badge: "mint", dot: "green" },
  Unpaid: { badge: "pink", dot: "pink" },
  Refunded: { badge: "gray", dot: "orange" },
};

const TABS = [
  { key: "all", label: "Tất Cả" },
  { key: "Pending", label: "Chờ Tiếp Nhận" },
  { key: "Processing", label: "Đang Chuẩn Bị & Đóng Gói" },
  { key: "Ready", label: "Sẵn Sàng Tại Quầy" },
  { key: "Completed", label: "Đã Hoàn Tất" },
  { key: "Cancelled", label: "Đã Hủy" },
];

// Bỏ dấu tiếng Việt để gõ "nguyen" vẫn tìm ra "Nguyễn"
const normalize = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

// Độ rộng cố định cho thanh skeleton (không dùng Math.random để mỗi lần render không bị nhảy)
const SKELETON_WIDTHS = [55, 85, 70, 90, 60, 75, 65, 45];

const SkeletonRows = () =>
  [0, 1, 2, 3, 4, 5].map((r) => (
    <tr key={r} className="order-static-row" aria-hidden="true">
      {SKELETON_WIDTHS.map((_, c) => (
        <td key={c}>
          <div className="order-skeleton-bar" style={{ width: `${SKELETON_WIDTHS[(r + c) % SKELETON_WIDTHS.length]}%` }} />
        </td>
      ))}
    </tr>
  ));

function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <div className="order-empty-state">
      <ion-icon name={icon}></ion-icon>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {onAction && (
        <button type="button" className="btn-pill-outline" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function OrderList() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [printAll, setPrintAll] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [activeDropdownOrderId, setActiveDropdownOrderId] = useState(null);
  const [rowLoadingId, setRowLoadingId] = useState(null);
  // Tăng mỗi lần tải/thao tác: phản hồi danh sách về muộn (VD: auto-refresh chạy song song lúc đổi trạng thái) sẽ bị bỏ qua
  const loadSeq = useRef(0);

  // Đóng popover đổi trạng thái khi bấm ra ngoài hoặc nhấn phím Escape
  useEffect(() => {
    if (!activeDropdownOrderId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest(".order-status-wrapper")) {
        setActiveDropdownOrderId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveDropdownOrderId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdownOrderId]);

  const loadOrders = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const res = await adminOrdersApi.getAll();
      if (seq !== loadSeq.current) return;
      setOrders(res.data);
      // Đồng bộ phiếu đang mở với dữ liệu mới (đơn có thể vừa được nhân viên khác cập nhật)
      setSelectedOrder((prev) => (prev && res.data.find((o) => o.order_id === prev.order_id)) || prev);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(apiErrorMessage(err, "Không tải được danh sách đơn hàng"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    // Tự làm mới định kỳ khi tab trình duyệt đang hiển thị
    const timer = setInterval(() => {
      if (!document.hidden) loadOrders();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  // Có đơn mới hoặc đơn vừa được cập nhật (khách hủy, nhân viên khác đổi trạng thái): tải lại ngay
  useRealtimeEvent(["new_order", "order_updated"], () => loadOrders());

  // Khi in bảng đối soát, hiển thị toàn bộ đơn đang lọc thay vì chỉ trang hiện tại
  useEffect(() => {
    const showAll = () => flushSync(() => setPrintAll(true));
    const restore = () => setPrintAll(false);
    window.addEventListener("beforeprint", showAll);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", showAll);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadOrders();
  };

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const openOrder = (o) => {
    setSelectedOrder(o);
    setCancelMode(false);
    setCancelReason("");
  };

  const runOrderAction = async (request, successMessage, fallback) => {
    setActionLoading(true);
    try {
      const res = await request();
      const updated = res.data;
      loadSeq.current++;
      setOrders((prev) => prev.map((o) => (o.order_id === updated.order_id ? updated : o)));
      // Chỉ cập nhật phiếu nếu vẫn đang mở đúng đơn này (người dùng có thể đã đóng phiếu khi đang chờ)
      setSelectedOrder((prev) => (prev?.order_id === updated.order_id ? updated : prev));
      setCancelMode(false);
      setCancelReason("");
      popup.success(successMessage(updated));
    } catch (err) {
      popup.error(apiErrorMessage(err, fallback));
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeStatus = (status) =>
    runOrderAction(
      () => adminOrdersApi.updateStatus(selectedOrder.order_id, status),
      (u) => `Đơn #${u.order_code} đã chuyển sang "${ORDER_STATUS[u.status]?.label || u.status}".`,
      "Cập nhật trạng thái thất bại"
    );

  const handleCancelOrder = () => {
    const reason = cancelReason.trim();
    if (!reason) return;
    runOrderAction(
      () => adminOrdersApi.updateStatus(selectedOrder.order_id, "Cancelled", reason),
      (u) => `Đã hủy đơn #${u.order_code}.`,
      "Hủy đơn hàng thất bại"
    );
  };

  const handleConfirmPayment = async () => {
    const order = selectedOrder;
    const confirmed = await popup.confirm({
      title: "Xác nhận đã thu tiền?",
      message: `Đơn #${order.order_code} đã thanh toán ${formatVND(order.final_cost, " đ")}?`,
      subtitle: `Phương thức: ${PAYMENT_METHOD[order.payment_method] || order.payment_method}. Thao tác sẽ được ghi vào lịch sử xử lý đơn.`,
      confirmText: "Đã thu tiền",
      cancelText: "Quay lại",
      type: "success",
    });
    if (!confirmed) return;
    runOrderAction(
      () => adminOrdersApi.confirmPayment(order.order_id),
      (u) => `Đã xác nhận thanh toán đơn #${u.order_code}.`,
      "Xác nhận thanh toán thất bại"
    );
  };

  const handleQuickStatusChange = async (order, nextStatus) => {
    setActiveDropdownOrderId(null);

    // Kiểm tra ràng buộc thanh toán trước khi hoàn tất
    if (nextStatus === "Completed") {
      if (needsPaymentFirst(order)) {
        popup.warning(
          `Đơn #${order.order_code} (${PAYMENT_METHOD[order.payment_method] || order.payment_method}) chưa được thanh toán online. Vui lòng kiểm tra hoặc xác nhận thanh toán trước.`
        );
        openOrder(order);
        return;
      }
      if (order.payment_status !== "Paid" && order.payment_method === "COD") {
        const confirmed = await popup.confirm({
          title: "Hoàn tất & Xác nhận thu tiền?",
          message: `Đơn #${order.order_code} đã thanh toán ${formatVND(order.final_cost, " đ")} tiền mặt tại quầy?`,
          subtitle: "Thao tác sẽ tự động chuyển đơn sang Hoàn Tất và đánh dấu Đã Thanh Toán.",
          confirmText: "Hoàn tất & Đã thu tiền",
          cancelText: "Quay lại",
          type: "success",
        });
        if (!confirmed) return;
      }
    }

    // Nếu chọn hủy đơn, mở modal chi tiết ở chế độ hủy để nhập lý do (bắt buộc hoàn kho)
    if (nextStatus === "Cancelled") {
      openOrder(order);
      setCancelMode(true);
      return;
    }

    setRowLoadingId(order.order_id);
    try {
      const res = await adminOrdersApi.updateStatus(order.order_id, nextStatus);
      const updated = res.data;
      loadSeq.current++;
      setOrders((prev) => prev.map((o) => (o.order_id === updated.order_id ? updated : o)));
      setSelectedOrder((prev) => (prev?.order_id === updated.order_id ? updated : prev));
      popup.success(`Đơn #${updated.order_code} đã chuyển sang "${ORDER_STATUS[updated.status]?.label || updated.status}".`);
    } catch (err) {
      popup.error(apiErrorMessage(err, "Cập nhật trạng thái thất bại"));
    } finally {
      setRowLoadingId(null);
    }
  };

  const query = normalize(search.trim().replace(/^#/, ""));
  const searched = query
    ? orders.filter(
        (o) =>
          normalize(o.order_code).includes(query) ||
          normalize(o.recipient_name).includes(query) ||
          (o.recipient_phone || "").includes(query.replace(/\s+/g, ""))
      )
    : orders;

  const countFor = (key) => (key === "all" ? searched.length : searched.filter((o) => o.status === key).length);

  const filteredOrders = activeTab === "all" ? searched : searched.filter((o) => o.status === activeTab);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const visibleOrders = printAll ? filteredOrders : filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const lastUpdatedText = lastUpdated?.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const showSkeleton = loading && orders.length === 0;

  const renderEmptyState = () => {
    if (error && orders.length === 0) {
      return <EmptyState icon="cloud-offline-outline" title="Không tải được đơn hàng" text={error} actionLabel="Thử lại" onAction={handleRefresh} />;
    }
    if (orders.length === 0) {
      return <EmptyState icon="receipt-outline" title="Chưa có đơn hàng nào" text="Đơn hàng mới sẽ xuất hiện ở đây khi khách đặt bánh." />;
    }
    const tabLabel = TABS.find((t) => t.key === activeTab)?.label;
    if (query) {
      return (
        <EmptyState
          icon="search-outline"
          title="Không tìm thấy đơn hàng"
          text={`Không có đơn nào khớp "${search.trim()}"${activeTab !== "all" ? ` trong mục "${tabLabel}"` : ""}.`}
          actionLabel="Xóa tìm kiếm"
          onAction={() => handleSearch("")}
        />
      );
    }
    return <EmptyState icon="file-tray-outline" title={`Không có đơn ở mục "${tabLabel}"`} text="Đơn hàng sẽ hiện ở đây khi chuyển sang trạng thái này." />;
  };

  const selectedStatus = selectedOrder && (ORDER_STATUS[selectedOrder.status] || {});
  const selectedPay = selectedOrder && (PAYMENT_BADGE[selectedOrder.payment_status] || PAYMENT_BADGE.Unpaid);

  return (
    <>
      <AdminHeader />

      <div className="admin-page-container">
        {/* Page Title & Actions */}
        <div className="admin-page-header-row">
          <div className="admin-page-title-group">
            <h1>Quản Lý Đơn Hàng &amp; Hóa Đơn</h1>
            <p>Theo dõi {orders.length} đơn đặt hàng, lịch hẹn nhận tại quầy &amp; đối soát hóa đơn bán lẻ</p>
          </div>

          <div className="admin-page-actions">
            <button className="btn-pill-outline" type="button" onClick={() => window.print()}>
              <ion-icon name="print-outline"></ion-icon>
              <span>In Bảng Đối Soát</span>
            </button>
            <button className={`btn-pill-primary ${loading ? "is-spinning" : ""}`} type="button" disabled={loading} onClick={handleRefresh}>
              <ion-icon name="refresh-outline"></ion-icon>
              <span>Làm Mới (Live)</span>
            </button>
          </div>
        </div>

        {/* Tab Pills Filter */}
        <div className="admin-filter-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setActiveTab(t.key); setCurrentPage(1); }}
              className={`tab-pill-btn ${activeTab === t.key ? "active" : ""}`}
            >
              {t.label} ({countFor(t.key)})
            </button>
          ))}
        </div>

        {/* Main Orders Table */}
        <div className="admin-card-box">
          <div className="order-toolbar">
            <div className="order-search-box">
              <ion-icon name="search-outline"></ion-icon>
              <input
                type="search"
                placeholder="Tìm mã đơn, tên khách, SĐT..."
                aria-label="Tìm đơn hàng theo mã đơn, tên khách hoặc số điện thoại"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="order-search-clear" aria-label="Xóa tìm kiếm" onClick={() => handleSearch("")}>
                  <ion-icon name="close-circle"></ion-icon>
                </button>
              )}
            </div>
            <div className="order-toolbar-meta">
              {lastUpdatedText && (
                <span className="order-last-updated">
                  <span className={`dot-status ${error ? "orange" : "green"}`}></span>
                  Cập nhật lúc {lastUpdatedText}
                </span>
              )}
              <div className="order-pagesize-selector">
                <span className="order-pagesize-label">Hiển thị:</span>
                <div className="order-pagesize-buttons">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`order-pagesize-btn ${pageSize === size ? "active" : ""}`}
                      onClick={() => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      title={`${size} đơn mỗi trang`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <span className="order-pagesize-unit">đơn/trang</span>
              </div>
              <span className="order-toolbar-total">
                (Tổng <strong>{filteredOrders.length}</strong> đơn)
              </span>
            </div>
          </div>

          {error && orders.length > 0 && (
            <div className="order-error-banner" role="alert">
              <ion-icon name="cloud-offline-outline"></ion-icon>
              <span>{error} — đang hiển thị dữ liệu lúc {lastUpdatedText}.</span>
            </div>
          )}

          <div className="admin-table-clean-wrapper">
            <table className="admin-table-clean" aria-busy={loading}>
              <thead>
                <tr>
                  <th>MÃ ĐƠN</th>
                  <th>KHÁCH HÀNG &amp; SĐT</th>
                  <th>HẸN LẤY BÁNH</th>
                  <th>MÓN &amp; KÍCH CỠ</th>
                  <th className="col-currency">TỔNG TIỀN</th>
                  <th>THANH TOÁN</th>
                  <th>TRẠNG THÁI</th>
                  <th className="col-actions">CHI TIẾT</th>
                </tr>
              </thead>
              <tbody>
                {showSkeleton && <SkeletonRows />}
                {!showSkeleton && filteredOrders.length === 0 && (
                  <tr className="order-static-row">
                    <td colSpan="8">{renderEmptyState()}</td>
                  </tr>
                )}
                {visibleOrders.map((o, idx) => {
                  const urgent = isUrgent(o);
                  const st = ORDER_STATUS[o.status] || {};
                  const pay = PAYMENT_BADGE[o.payment_status] || PAYMENT_BADGE.Unpaid;
                  const canChangeStatus = o.next_statuses && o.next_statuses.length > 0;
                  const isNearBottom = idx >= visibleOrders.length - 2 && visibleOrders.length >= 3;
                  const isOpen = activeDropdownOrderId === o.order_id;
                  const isRowLoading = rowLoadingId === o.order_id;
                  return (
                  <tr key={o.order_id}>
                    <td>
                      <span className="order-code">#{o.order_code}</span>
                    </td>
                    <td>
                      <div className="order-customer-name">{o.recipient_name}</div>
                      <div className="order-customer-phone">{o.recipient_phone}</div>
                    </td>
                    <td>
                      <div className={`order-pickup ${urgent ? "is-urgent" : ""}`}>
                        <ion-icon name="time-outline"></ion-icon>
                        <span>{formatDateTime(o.pickup_time)}</span>
                      </div>
                      {o.notes && (
                        <div className="order-note-inline">
                          <ion-icon name="create-outline"></ion-icon>{o.notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="order-items">
                        {o.details.map((it) => (
                          <div key={`${it.product_id}-${it.size_id}`} className="order-item">
                            <strong>{it.quantity}x</strong> {it.product_name} <span className="order-item-size">({it.size_name})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="col-currency">
                      <span className="order-total">{formatVND(o.final_cost, " đ")}</span>
                    </td>
                    <td>
                      <div className="order-pay-method">{PAYMENT_METHOD[o.payment_method] || o.payment_method}</div>
                      <div className={`order-pay-status is-${(o.payment_status || "unpaid").toLowerCase()}`}>
                        {PAYMENT_STATUS[o.payment_status] || o.payment_status}
                      </div>
                    </td>
                    <td className="col-status">
                      <div className="order-status-wrapper">
                        {canChangeStatus ? (
                          <button
                            type="button"
                            className={`badge-pill order-badge order-badge-interactive ${st.badge}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownOrderId(isOpen ? null : o.order_id);
                            }}
                            disabled={isRowLoading}
                            title="Nhấp để chuyển nhanh trạng thái đơn hàng"
                            aria-haspopup="true"
                            aria-expanded={isOpen}
                          >
                            {isRowLoading && <span className="order-badge-spinner"></span>}
                            <span>{st.label || o.status}</span>
                            <svg
                              className={`order-badge-chevron ${isOpen ? "is-open" : ""}`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        ) : (
                          <span className={`badge-pill order-badge ${st.badge}`}>
                            <span>{st.label || o.status}</span>
                          </span>
                        )}

                        {isOpen && canChangeStatus && (
                          <div
                            className={`order-status-popover ${isNearBottom ? "is-dropup" : ""}`}
                            onClick={(e) => e.stopPropagation()}
                            role="menu"
                          >
                            <div className="order-popover-header">Chuyển trạng thái</div>
                            {o.next_statuses
                              .filter((s) => s !== "Cancelled")
                              .map((s) => {
                                const stepInfo = NEXT_STEP[s] || { label: ORDER_STATUS[s]?.label || s, icon: "arrow-forward-outline" };
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    className="order-popover-item is-primary"
                                    onClick={() => handleQuickStatusChange(o, s)}
                                    role="menuitem"
                                  >
                                    <ion-icon name={stepInfo.icon}></ion-icon>
                                    <span>{stepInfo.label}</span>
                                  </button>
                                );
                              })}
                            {o.next_statuses.includes("Cancelled") && (
                              <>
                                <div className="order-popover-divider"></div>
                                <button
                                  type="button"
                                  className="order-popover-item is-danger"
                                  onClick={() => handleQuickStatusChange(o, "Cancelled")}
                                  role="menuitem"
                                >
                                  <ion-icon name="close-circle-outline"></ion-icon>
                                  <span>Hủy đơn hàng...</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="col-actions">
                      <button type="button" onClick={() => openOrder(o)} className="btn-pill-outline order-view-btn">
                        Xem Phiếu
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(totalPages > 1 || filteredOrders.length > PAGE_SIZE_OPTIONS[0]) && (
            <div className="order-pagination">
              <span className="order-pagination-info">
                Hiển thị {filteredOrders.length === 0 ? 0 : (page - 1) * pageSize + 1} - {(page - 1) * pageSize + visibleOrders.length} trên {filteredOrders.length} đơn
              </span>
              {totalPages > 1 && (
                <div className="order-pagination-controls">
                  <button type="button" className="tab-pill-btn" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>
                    &larr; Trước
                  </button>
                  <span className="order-pagination-page">Trang {page} / {totalPages}</span>
                  <button type="button" className="tab-pill-btn" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>
                    Sau &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Xem Phiếu / Chi Tiết Hóa Đơn */}
        {selectedOrder && (
          <div className="order-modal-overlay">
            <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
              {/* Modal Header */}
              <div className="order-modal-header">
                <div>
                  <span className="order-modal-eyebrow">PHIẾU HÓA ĐƠN BÁN LẺ</span>
                  <h3 id="order-modal-title" className="order-modal-title">#{selectedOrder.order_code}</h3>
                </div>
                <button type="button" className="order-modal-close" aria-label="Đóng phiếu" onClick={() => setSelectedOrder(null)}>
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>

              {/* Info meta */}
              <div className="order-meta">
                <div className="order-meta-row">
                  <span className="order-meta-label">Khách hàng:</span>
                  <span className="order-meta-value">{selectedOrder.recipient_name} ({selectedOrder.recipient_phone})</span>
                </div>
                <div className="order-meta-row">
                  <span className="order-meta-label">Hẹn nhận bánh:</span>
                  <span className="order-meta-value is-accent">{formatDateTime(selectedOrder.pickup_time)}</span>
                </div>
                <div className="order-meta-row">
                  <span className="order-meta-label">Trạng thái:</span>
                  <span className={`badge-pill order-badge-sm ${selectedStatus.badge || ""}`}>
                    {selectedStatus.label || selectedOrder.status}
                  </span>
                </div>
                <div className="order-meta-row">
                  <span className="order-meta-label">Thanh toán:</span>
                  <span className="order-meta-pay">
                    <span className="order-meta-value">
                      {PAYMENT_METHOD[selectedOrder.payment_method] || selectedOrder.payment_method}
                    </span>
                    <span className={`badge-pill order-badge-sm ${selectedPay.badge}`}>
                      <span className={`dot-status ${selectedPay.dot}`}></span>
                      {PAYMENT_STATUS[selectedOrder.payment_status] || selectedOrder.payment_status}
                    </span>
                    {selectedOrder.payment_status === "Unpaid" && selectedOrder.status !== "Cancelled" && (
                      <button
                        type="button"
                        className="btn-pill-outline order-pay-confirm-btn"
                        disabled={actionLoading}
                        onClick={handleConfirmPayment}
                      >
                        Xác nhận đã thu
                      </button>
                    )}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="order-section">
                <span className="order-section-label">Danh Sách Bánh</span>
                <div className="order-receipt-items">
                  {selectedOrder.details.map((it) => (
                    <div key={`${it.product_id}-${it.size_id}`} className="order-receipt-item">
                      <span><strong>{it.quantity}x</strong> {it.product_name} <small className="order-item-size">({it.size_name})</small></span>
                      <span className="order-receipt-item-price">{formatVND(it.total_price, " đ")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="order-note-box">
                  <strong>Ghi chú đơn hàng:</strong> {selectedOrder.notes}
                </div>
              )}

              {Number(selectedOrder.discount_amount) > 0 && (
                <div className="order-receipt-row order-receipt-discount-row">
                  <div className="order-receipt-discount-label">
                    <span>Giảm giá:</span>
                    {(selectedOrder.promotion_code || selectedOrder.promotion_name) && (
                      <span
                        className="order-voucher-badge"
                        title={selectedOrder.promotion_name || selectedOrder.promotion_code}
                      >
                        <ion-icon name="ticket-outline"></ion-icon>
                        {selectedOrder.promotion_code && (
                          <strong className="order-voucher-code">[{selectedOrder.promotion_code}]</strong>
                        )}
                        {selectedOrder.promotion_name && (
                          <span className="order-voucher-name">{selectedOrder.promotion_name}</span>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="order-receipt-discount">-{formatVND(selectedOrder.discount_amount, " đ")}</span>
                </div>
              )}

              {/* Total & Action */}
              <div className="order-receipt-total">
                <span>Tổng Thanh Toán:</span>
                <span className="order-receipt-total-amount">{formatVND(selectedOrder.final_cost, " đ")}</span>
              </div>

              {/* Timeline lịch sử trạng thái */}
              {selectedOrder.status_logs?.length > 0 && (
                <div className="order-timeline-section">
                  <span className="order-section-label">Lịch Sử Xử Lý</span>
                  <div className="order-timeline">
                    {selectedOrder.status_logs.map((log) => {
                      // Log thanh toán giữ nguyên trạng thái đơn (old_status === new_status)
                      const isPaymentLog = log.old_status === log.new_status;
                      const variant = log.new_status === "Cancelled" ? "is-cancelled" : isPaymentLog ? "is-payment" : "";
                      return (
                        <div key={log.log_id} className={`order-timeline-item ${variant}`}>
                          <div className="order-timeline-rail">
                            <span className="order-timeline-dot"></span>
                            <span className="order-timeline-line"></span>
                          </div>
                          <div className="order-timeline-body">
                            <div className="order-timeline-title">
                              {isPaymentLog ? "Xác nhận thanh toán" : ORDER_STATUS[log.new_status]?.label || log.new_status}
                            </div>
                            <div className="order-timeline-meta">
                              {formatDateTime(log.changed_at)}{log.changed_by ? ` · ${log.changed_by}` : ""}
                            </div>
                            {log.note && <div className="order-timeline-note">{log.note}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cảnh báo thanh toán online nếu chưa thanh toán trước khi hoàn tất */}
              {!cancelMode && needsPaymentFirst(selectedOrder) && selectedOrder.next_statuses?.includes("Completed") && (
                <div className="order-actions-hint" role="note">
                  <ion-icon name="alert-circle-outline"></ion-icon>
                  <span>Đơn thanh toán online cần được xác nhận đã thanh toán trước khi hoàn tất.</span>
                </div>
              )}

              {/* Hộp nhập lý do hủy đơn khi ở chế độ cancelMode */}
              {cancelMode && (
                <div className="order-cancel-box">
                  <label htmlFor="order-cancel-reason" className="order-cancel-label">
                    Lý do hủy đơn (bắt buộc) — tồn kho sẽ được hoàn lại
                  </label>
                  <textarea
                    id="order-cancel-reason"
                    className="order-cancel-textarea"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                    autoFocus
                    placeholder="VD: Khách không đến nhận, hết nguyên liệu..."
                  />
                  <div className="order-cancel-actions">
                    <button
                      type="button"
                      className="order-btn-secondary"
                      disabled={actionLoading}
                      onClick={() => { setCancelMode(false); setCancelReason(""); }}
                    >
                      <span>Quay Lại</span>
                    </button>
                    <button
                      type="button"
                      className="order-btn-danger-solid"
                      disabled={actionLoading || !cancelReason.trim()}
                      onClick={handleCancelOrder}
                    >
                      <ion-icon name="close-circle"></ion-icon>
                      <span>Xác Nhận Hủy Đơn</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hàng nút nghiệp vụ ở đáy Modal (1 hàng ngang thống nhất) */}
              {!cancelMode && (
                <div className="order-modal-footer">
                  {/* Destructive Action: Hủy Đơn (đẩy sang góc trái, cách xa nút chính để tránh bấm nhầm) */}
                  {selectedOrder.next_statuses?.includes("Cancelled") ? (
                    <button
                      type="button"
                      className="order-btn-cancel"
                      disabled={actionLoading}
                      onClick={() => setCancelMode(true)}
                      title="Hủy đơn hàng và hoàn lại tồn kho"
                    >
                      <ion-icon name="close-circle-outline"></ion-icon>
                      <span>Hủy Đơn</span>
                    </button>
                  ) : (
                    <div className="order-modal-footer-spacer"></div>
                  )}

                  {/* Cụm nút xử lý bên phải: In Phiếu Thu (Secondary) + Bước Tiếp Theo (Primary) */}
                  <div className="order-modal-footer-actions">
                    <button
                      type="button"
                      className="order-btn-secondary"
                      onClick={() => window.print()}
                      title="In phiếu thu bán lẻ"
                    >
                      <ion-icon name="print-outline"></ion-icon>
                      <span>In Phiếu Thu</span>
                    </button>

                    {selectedOrder.next_statuses
                      ?.filter((s) => NEXT_STEP[s])
                      .map((s) => {
                        const blocked = s === "Completed" && needsPaymentFirst(selectedOrder);
                        const codUnpaid = s === "Completed" && selectedOrder.payment_status !== "Paid" && !blocked;
                        return (
                          <button
                            key={s}
                            type="button"
                            className="btn-pill-primary order-btn-primary"
                            disabled={actionLoading || blocked}
                            title={blocked ? "Cần xác nhận thanh toán trước khi hoàn tất" : undefined}
                            onClick={() => handleChangeStatus(s)}
                          >
                            <ion-icon name={NEXT_STEP[s].icon}></ion-icon>
                            <span>{codUnpaid ? "Thu Tiền & Hoàn Tất" : NEXT_STEP[s].label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
