import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import AdminHeader from "../components/AdminHeader";
import { adminOrdersApi } from "../../api/admin";
import { formatVND, formatDateTime, apiErrorMessage, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "../../utils/format";
import popup from "../../utils/popup";
import usePopupStore from "../../store/popupStore";
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

// "1 giờ 20 phút", "45 phút", "2 ngày"
const formatDuration = (ms) => {
  const mins = Math.round(Math.abs(ms) / 60000);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return mins % 60 ? `${hours} giờ ${mins % 60} phút` : `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
};

// Đếm ngược tới giờ hẹn lấy bánh (chỉ với đơn chưa xong)
const pickupCountdown = (o) => {
  if (!o.pickup_time || ["Completed", "Cancelled"].includes(o.status)) return null;
  const diff = new Date(o.pickup_time).getTime() - Date.now();
  return diff >= 0 ? { text: `Còn ${formatDuration(diff)}`, late: false } : { text: `Trễ ${formatDuration(diff)}`, late: true };
};

// Các bước xử lý một đơn, hiển thị thành thanh tiến trình trên panel chi tiết
const STATUS_STEPS = [
  { key: "Pending", label: "Chờ nhận" },
  { key: "Processing", label: "Chuẩn bị" },
  { key: "Ready", label: "Sẵn sàng" },
  { key: "Completed", label: "Hoàn tất" },
];

// Nút chuyển bước tiếp theo trên panel chi tiết (server trả next_statuses theo bảng chuyển trạng thái hợp lệ)
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

// Giới hạn ghi chú tối đa 50 chữ (nếu dữ liệu cũ vượt quá thì cắt gọn)
const truncateWords = (str, maxWords = 50) => {
  if (!str) return "";
  const words = str.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return str;
  return words.slice(0, maxWords).join(" ") + "...";
};

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

function StatusStepper({ status }) {
  const current = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="order-stepper" aria-label="Tiến trình xử lý đơn">
      {STATUS_STEPS.map((s, i) => {
        const done = i < current || status === "Completed";
        return (
          <li key={s.key} className={`order-step ${done ? "is-done" : i === current ? "is-current" : ""}`}>
            <span className="order-step-dot">{done && <ion-icon name="checkmark"></ion-icon>}</span>
            <span className="order-step-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
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
    const restore = () => {
      setPrintAll(false);
      document.body.classList.remove("print-order-receipt");
    };
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
    // Bấm lại đúng đơn đang mở thì giữ nguyên (không mất lý do hủy đang gõ dở)
    if (selectedOrder?.order_id === o.order_id) return;
    setSelectedOrder(o);
    setCancelMode(false);
    setCancelReason("");
  };

  const closePanel = () => setSelectedOrder(null);

  // In riêng phiếu thu của đơn đang mở (CSS @media print ẩn phần còn lại của trang)
  const printReceipt = () => {
    document.body.classList.add("print-order-receipt");
    window.print();
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      popup.success(`Đã sao chép ${label}.`);
    } catch {
      popup.error("Không sao chép được, vui lòng thử lại.");
    }
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

  const selectedId = selectedOrder?.order_id;
  const selectedIndex = selectedOrder ? filteredOrders.findIndex((o) => o.order_id === selectedId) : -1;

  // Chuyển sang đơn trước/sau trong danh sách đang lọc, tự lật trang nếu đơn nằm ở trang khác
  const goToSibling = (step) => {
    const target = filteredOrders[selectedIndex + step];
    if (selectedIndex < 0 || !target) return;
    openOrder(target);
    setCurrentPage(Math.floor((selectedIndex + step) / pageSize) + 1);
  };

  // Phím tắt khi panel đang mở: Esc đóng (hoặc thoát ô nhập lý do hủy), ↑/↓ chuyển đơn trước/sau.
  // Không truyền deps để handler luôn đọc danh sách mới nhất.
  useEffect(() => {
    if (!selectedOrder) return;
    const handleKeyDown = (e) => {
      // Nhường phím cho hộp thoại xác nhận và popover đổi trạng thái nếu đang mở
      if (usePopupStore.getState().dialog.isOpen || activeDropdownOrderId) return;
      const typing = e.target.closest?.("input, textarea, select");
      if (e.key === "Escape") {
        if (cancelMode) {
          setCancelMode(false);
          setCancelReason("");
        } else if (!typing) {
          closePanel();
        }
        return;
      }
      if (typing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        goToSibling(e.key === "ArrowUp" ? -1 : 1);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Giữ dòng đang xem trong tầm nhìn khi chuyển đơn bằng phím/nút
  useEffect(() => {
    if (selectedId) document.querySelector(`[data-order-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, page]);

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
  const countdown = selectedOrder && pickupCountdown(selectedOrder);
  const cancelLog =
    selectedOrder?.status === "Cancelled" ? selectedOrder.status_logs?.findLast((l) => l.new_status === "Cancelled") : null;

  return (
    <div className={`order-page ${selectedOrder ? "has-panel" : ""}`}>
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
        <div className="admin-card-box order-table-card">
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
                  <th className="col-items">MÓN &amp; KÍCH CỠ</th>
                  <th className="col-currency">TỔNG TIỀN</th>
                  <th className="col-payment">THANH TOÁN</th>
                  <th>TRẠNG THÁI</th>
                  <th className="col-actions" aria-label="Xem chi tiết"></th>
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
                  <tr
                    key={o.order_id}
                    data-order-id={o.order_id}
                    className={`order-row ${selectedId === o.order_id ? "is-selected" : ""}`}
                    tabIndex={0}
                    onClick={() => openOrder(o)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        openOrder(o);
                      }
                    }}
                  >
                    <td>
                      <span className="order-code">#{o.order_code}</span>
                    </td>
                    <td>
                      <div className="order-customer-name">{o.recipient_name}</div>
                      <div className="order-customer-phone">{o.recipient_phone}</div>
                    </td>
                    <td>
                      <div className={`order-pickup ${urgent ? "is-urgent" : ""}`} title={o.notes ? `Ghi chú: ${o.notes}` : undefined}>
                        <ion-icon name="time-outline"></ion-icon>
                        <span>{formatDateTime(o.pickup_time)}</span>
                        {o.notes && (
                          <ion-icon
                            name="document-text"
                            style={{ color: "#d97706", fontSize: "14px", marginLeft: "4px" }}
                            title={`Có ghi chú: ${o.notes}`}
                          />
                        )}
                      </div>
                    </td>
                    <td className="col-items">
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
                    <td className="col-payment">
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
                    <td className="col-actions" aria-hidden="true">
                      <ion-icon name="chevron-forward-outline"></ion-icon>
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
      </div>

      {/* Panel chi tiết đơn bên phải: bấm vào dòng nào trong bảng thì hiện ngay đơn đó */}
      {selectedOrder && (
        <>
          {/* Nền mờ chỉ hiện khi panel nổi đè lên bảng (màn hình hẹp) — bấm để đóng */}
          <div className="order-panel-backdrop" onClick={closePanel} aria-hidden="true" />

          <aside className="order-panel" aria-labelledby="order-panel-title">
            <div className="order-panel-header">
              <div className="order-panel-heading">
                <span className="order-panel-eyebrow">Chi tiết đơn hàng</span>
                <div className="order-panel-title-row">
                  <h3 id="order-panel-title" className="order-panel-title">#{selectedOrder.order_code}</h3>
                  <span className={`badge-pill order-badge-sm ${selectedStatus.badge || ""}`}>
                    {selectedStatus.label || selectedOrder.status}
                  </span>
                </div>
                <span className="order-panel-subtitle">Đặt lúc {formatDateTime(selectedOrder.order_date)}</span>
              </div>
              <div className="order-panel-nav">
                {selectedIndex >= 0 && (
                  <span className="order-panel-position">
                    {selectedIndex + 1}/{filteredOrders.length}
                  </span>
                )}
                <button
                  type="button"
                  className="order-icon-btn"
                  disabled={selectedIndex <= 0}
                  onClick={() => goToSibling(-1)}
                  title="Đơn trước (phím ↑)"
                  aria-label="Đơn trước"
                >
                  <ion-icon name="chevron-up-outline"></ion-icon>
                </button>
                <button
                  type="button"
                  className="order-icon-btn"
                  disabled={selectedIndex < 0 || selectedIndex >= filteredOrders.length - 1}
                  onClick={() => goToSibling(1)}
                  title="Đơn sau (phím ↓)"
                  aria-label="Đơn sau"
                >
                  <ion-icon name="chevron-down-outline"></ion-icon>
                </button>
                <button type="button" className="order-icon-btn" onClick={closePanel} title="Đóng (Esc)" aria-label="Đóng chi tiết đơn">
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
            </div>

            <div className="order-panel-body">
              {/* Tiến trình xử lý, hoặc lý do hủy nếu đơn đã hủy */}
              {selectedOrder.status === "Cancelled" ? (
                <div className="order-panel-cancelled">
                  <ion-icon name="close-circle"></ion-icon>
                  <div>
                    <strong>Đơn đã bị hủy</strong>
                    {cancelLog?.note && <p>Lý do: {cancelLog.note}</p>}
                    {cancelLog && (
                      <span>
                        {formatDateTime(cancelLog.changed_at)}{cancelLog.changed_by ? ` · ${cancelLog.changed_by}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <StatusStepper status={selectedOrder.status} />
              )}

              {/* Giờ hẹn lấy bánh + đếm ngược */}
              <div className={`order-panel-pickup ${countdown?.late ? "is-late" : isUrgent(selectedOrder) ? "is-urgent" : ""}`}>
                <ion-icon name="time-outline"></ion-icon>
                <div className="order-panel-pickup-info">
                  <span className="order-panel-pickup-label">Hẹn lấy bánh</span>
                  <strong>{formatDateTime(selectedOrder.pickup_time)}</strong>
                </div>
                {countdown && <span className="order-panel-countdown">{countdown.text}</span>}
              </div>

              {/* Khách hàng */}
              <section className="order-panel-section">
                <h4 className="order-section-label">Khách hàng</h4>
                <div className="order-panel-customer">
                  <span className="order-panel-avatar" aria-hidden="true">
                    {(selectedOrder.recipient_name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="order-panel-customer-info">
                    <div className="order-customer-name">{selectedOrder.recipient_name}</div>
                    <div className="order-customer-phone">{selectedOrder.recipient_phone}</div>
                  </div>
                  <a
                    href={`tel:${selectedOrder.recipient_phone}`}
                    className="order-icon-btn"
                    title="Gọi cho khách"
                    aria-label="Gọi cho khách"
                  >
                    <ion-icon name="call-outline"></ion-icon>
                  </a>
                  <button
                    type="button"
                    className="order-icon-btn"
                    title="Sao chép số điện thoại"
                    aria-label="Sao chép số điện thoại"
                    onClick={() => copyText(selectedOrder.recipient_phone, "số điện thoại")}
                  >
                    <ion-icon name="copy-outline"></ion-icon>
                  </button>
                </div>
              </section>

              {selectedOrder.notes && (
                <div className="order-note-box" title={selectedOrder.notes}>
                  <strong>Ghi chú đơn hàng:</strong> {truncateWords(selectedOrder.notes, 50)}
                </div>
              )}

              {/* Danh sách bánh */}
              <section className="order-panel-section">
                <div className="order-panel-section-head">
                  <h4 className="order-section-label">Danh sách bánh</h4>
                  <span className="order-panel-section-meta">{selectedOrder.total_quantity} bánh</span>
                </div>
                <ul className="order-panel-items">
                  {selectedOrder.details.map((it) => (
                    <li key={`${it.product_id}-${it.size_id}`} className="order-panel-item">
                      <span className="order-panel-qty">{it.quantity}x</span>
                      <div className="order-panel-item-info">
                        <div className="order-panel-item-name">{it.product_name}</div>
                        <div className="order-panel-item-meta">
                          {it.size_name} · {formatVND(it.price, " đ")}
                        </div>
                        {it.note && <div className="order-panel-item-note">{it.note}</div>}
                      </div>
                      <span className="order-receipt-item-price">{formatVND(it.total_price, " đ")}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Thanh toán */}
              <section className="order-panel-section">
                <h4 className="order-section-label">Thanh toán</h4>
                <div className="order-panel-summary">
                  <div className="order-receipt-row">
                    <span>Phương thức</span>
                    <strong>{PAYMENT_METHOD[selectedOrder.payment_method] || selectedOrder.payment_method}</strong>
                  </div>
                  <div className="order-receipt-row">
                    <span>Trạng thái</span>
                    <span className="order-panel-pay-status">
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
                  <div className="order-receipt-row">
                    <span>Tạm tính</span>
                    <span className="order-receipt-item-price">{formatVND(selectedOrder.total_cost, " đ")}</span>
                  </div>

                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="order-receipt-row order-receipt-discount-row">
                      <div className="order-receipt-discount-label">
                        <span>Giảm giá</span>
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

                  <div className="order-receipt-total">
                    <span>Tổng thanh toán</span>
                    <span className="order-receipt-total-amount">{formatVND(selectedOrder.final_cost, " đ")}</span>
                  </div>
                </div>
              </section>

              {/* Timeline lịch sử trạng thái */}
              {selectedOrder.status_logs?.length > 0 && (
                <section className="order-panel-section">
                  <h4 className="order-section-label">Lịch sử xử lý</h4>
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
                </section>
              )}
            </div>

            {/* Thao tác nghiệp vụ luôn ghim ở đáy panel */}
            <div className="order-panel-footer">
              {cancelMode ? (
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
              ) : (
                <>
                  {/* Cảnh báo thanh toán online nếu chưa thanh toán trước khi hoàn tất */}
                  {needsPaymentFirst(selectedOrder) && selectedOrder.next_statuses?.includes("Completed") && (
                    <div className="order-actions-hint" role="note">
                      <ion-icon name="alert-circle-outline"></ion-icon>
                      <span>Đơn thanh toán online cần được xác nhận đã thanh toán trước khi hoàn tất.</span>
                    </div>
                  )}

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

                  <div className="order-panel-footer-row">
                    {/* Hủy đơn để bên trái, tách khỏi nút chính để tránh bấm nhầm */}
                    {selectedOrder.next_statuses?.includes("Cancelled") && (
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
                    )}
                    <button type="button" className="order-btn-secondary" onClick={printReceipt} title="In phiếu thu bán lẻ">
                      <ion-icon name="print-outline"></ion-icon>
                      <span>In Phiếu Thu</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
