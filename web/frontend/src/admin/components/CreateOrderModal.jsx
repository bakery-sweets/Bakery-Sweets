import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminOrdersApi } from "../../api/admin";
import { formatVND, imageUrl, apiErrorMessage } from "../../utils/format";
import popup from "../../utils/popup";
import usePopupStore from "../../store/popupStore";
import useAdminAuthStore from "../../store/adminAuthStore";
import { useRealtimeEvent } from "../../realtime/useRealtime";
import { printThermalReceipt } from "../../utils/thermalReceipt";
import "./CreateOrderModal.css";

// SĐT dùng chung cho khách lẻ vãng lai — khớp WALK_IN_PHONE ở backend (app/services/admin/order_service.py).
// Không dùng 0900000000 vì đó là SĐT tài khoản admin trong dữ liệu mẫu.
export const WALK_IN_PHONE = "0000000000";
const WALK_IN_NAME = "Khách vãng lai";
const PHONE_REGEX = /^0\d{9}$/;
const NOTES_MAX = 200;
const LOOKUP_DEBOUNCE_MS = 400;
const PRINT_PREF_KEY = "admin-pos-print-receipt";

// Hai kênh tạo đơn: khách gọi điện (mặc định) và bán trực tiếp tại quầy
const CHANNELS = [
  { key: "phone", label: "Bán Online", icon: "call-outline", eyebrow: "Đơn đặt qua điện thoại" },
  { key: "counter", label: "Bán tại quầy", icon: "storefront-outline", eyebrow: "Bán hàng tại quầy" },
];

const PAYMENT_OPTIONS = [
  { key: "COD", label: "Tiền mặt", icon: "cash-outline" },
  { key: "Banking", label: "Chuyển khoản", icon: "swap-horizontal-outline" },
  { key: "Credit Card", label: "Quẹt thẻ", icon: "card-outline" },
  { key: "Momo", label: "Momo", icon: "wallet-outline" },
  { key: "VNPay", label: "VNPay", icon: "qr-code-outline" },
];

// Cần khách có mặt mới thu được: đơn qua điện thoại không thể "đã thanh toán" bằng các cách này (khớp backend)
const IN_PERSON_METHODS = ["COD", "Credit Card"];

// "15:00, Thứ Năm 05/11/2026": đọc lại giờ hẹn cho khách qua điện thoại
const formatPickupLong = (d) =>
  `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, ${d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;

// Bỏ dấu tiếng Việt để gõ "dau" vẫn tìm ra "Dâu"
const normalize = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

const lineKey = (productId, sizeId) => `${productId}-${sizeId}`;

const pad = (n) => String(n).padStart(2, "0");
// Giá trị cho <input type="datetime-local"> theo giờ máy
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const roundUpQuarter = (d) => {
  const r = new Date(d);
  r.setSeconds(0, 0);
  r.setMinutes(Math.ceil(r.getMinutes() / 15) * 15);
  return r;
};

const PICKUP_PRESETS = [
  { label: "+1 giờ", at: () => roundUpQuarter(new Date(Date.now() + 60 * 60 * 1000)) },
  { label: "+3 giờ", at: () => roundUpQuarter(new Date(Date.now() + 3 * 60 * 60 * 1000)) },
  {
    label: "Sáng mai 9:00",
    at: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Chiều mai 17:00",
    at: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      return d;
    },
  },
];

// Gợi ý mệnh giá khách hay đưa: đúng số tiền và các mốc tròn 50k / 100k / 200k / 500k
const cashSuggestions = (total) => {
  if (total <= 0) return [];
  const values = new Set([total]);
  for (const step of [50000, 100000, 200000, 500000]) {
    values.add(Math.ceil(total / step) * step);
  }
  return [...values].sort((a, b) => a - b);
};

const readPrintPref = () => {
  try {
    return localStorage.getItem(PRINT_PREF_KEY) !== "0";
  } catch {
    return true;
  }
};

const writePrintPref = (value) => {
  try {
    localStorage.setItem(PRINT_PREF_KEY, value ? "1" : "0");
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua, chỉ là tùy chọn tiện lợi
  }
};

export default function CreateOrderModal({ onClose, onCreated }) {
  const cashier = useAdminAuthStore((s) => s.user?.phone);

  // --- Danh mục bánh ---
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // --- Đơn hàng ---
  const [channel, setChannel] = useState("phone");
  const [cart, setCart] = useState([]); // [{ product_id, size_id, quantity, product_name, size_name, image }]
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  // status: idle | loading | found | new | error; khi found kèm dữ liệu tra cứu từ server (data)
  const [lookup, setLookup] = useState({ status: "idle" });
  const nameSourceRef = useRef("user"); // "auto" khi tên do hệ thống điền, để còn được thay khi đổi SĐT
  const [orderType, setOrderType] = useState("immediate"); // chỉ dùng cho tab "Bán tại quầy"
  const [confirmOpen, setConfirmOpen] = useState(false); // bước đọc lại đơn cho khách (đơn điện thoại)
  const [pickup, setPickup] = useState(() => toLocalInput(PICKUP_PRESETS[1].at()));
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [preorderPaid, setPreorderPaid] = useState(false);
  const [cash, setCash] = useState(""); // chỉ chữ số
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState(null); // { code, name, discount, subtotal, phone }
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const voucherSeq = useRef(0);
  const [printAfter, setPrintAfter] = useState(readPrintPref);
  const [submitting, setSubmitting] = useState(false);
  const searchInputRef = useRef(null);

  const loadCatalog = useCallback(async () => {
    try {
      const res = await adminOrdersApi.getCatalog();
      setCatalog(res.data || []);
      setCatalogError("");
    } catch (err) {
      setCatalogError(apiErrorMessage(err, "Không tải được danh sách bánh"));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    searchInputRef.current?.focus();
  }, [loadCatalog]);

  // Tồn kho thay đổi (đơn online, nhân viên khác bán, nhập kho): cập nhật ngay số còn lại trên nút size
  useRealtimeEvent("stock_updated", (e) => {
    const updates = new Map((e?.items || []).map((it) => [lineKey(it.product_id, it.size_id), it.stock_quantity]));
    if (!updates.size) return;
    setCatalog((prev) =>
      prev.map((p) =>
        p.sizes.some((s) => updates.has(lineKey(p.product_id, s.size_id)))
          ? {
            ...p,
            sizes: p.sizes.map((s) => {
              const k = lineKey(p.product_id, s.size_id);
              return updates.has(k) ? { ...s, stock_quantity: updates.get(k) } : s;
            }),
          }
          : p
      )
    );
  });
  useRealtimeEvent("products_changed", () => loadCatalog());

  // Khóa cuộn trang nền khi modal đang mở
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Tra cứu (product, size) hiện hành: giá & tồn kho luôn lấy từ danh mục mới nhất
  const sizeIndex = useMemo(() => {
    const map = new Map();
    for (const p of catalog) {
      for (const s of p.sizes) map.set(lineKey(p.product_id, s.size_id), { product: p, size: s });
    }
    return map;
  }, [catalog]);

  const qtyInCart = useMemo(() => new Map(cart.map((l) => [lineKey(l.product_id, l.size_id), l.quantity])), [cart]);

  const categories = useMemo(() => {
    const names = [...new Set(catalog.map((p) => p.category_name).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b, "vi"));
  }, [catalog]);

  const query = normalize(search.trim());
  const visibleProducts = catalog.filter(
    (p) =>
      (category === "all" || p.category_name === category) &&
      (!query || normalize(p.product_name).includes(query) || normalize(p.category_name).includes(query))
  );

  // --- Giỏ hàng ---
  const lines = cart.map((l) => {
    const info = sizeIndex.get(lineKey(l.product_id, l.size_id));
    const price = info ? Number(info.size.price) : 0;
    const stock = info ? Number(info.size.stock_quantity) || 0 : 0;
    return { ...l, info, price, stock, total: price * l.quantity };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);

  const addToCart = (product, size) => {
    const k = lineKey(product.product_id, size.size_id);
    const stock = Number(size.stock_quantity) || 0;
    if ((qtyInCart.get(k) || 0) >= stock) {
      popup.warning(`${product.product_name} (${size.size_name}) chỉ còn ${stock} cái trong kho.`);
      return;
    }
    setCart((prev) => {
      const found = prev.find((l) => lineKey(l.product_id, l.size_id) === k);
      if (found) return prev.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        {
          product_id: product.product_id,
          size_id: size.size_id,
          quantity: 1,
          product_name: product.product_name,
          size_name: size.size_name,
          image: product.image,
        },
      ];
    });
  };

  const setLineQty = (k, qty) =>
    setCart((prev) =>
      prev.flatMap((l) => {
        if (lineKey(l.product_id, l.size_id) !== k) return [l];
        return qty <= 0 ? [] : [{ ...l, quantity: qty }];
      })
    );

  const removeLine = (k) => setCart((prev) => prev.filter((l) => lineKey(l.product_id, l.size_id) !== k));

  const clearCart = async () => {
    const ok = await popup.confirm({
      title: "Xóa tất cả bánh đã chọn?",
      message: `${totalQty} bánh trong đơn sẽ bị bỏ.`,
      confirmText: "Xóa tất cả",
      cancelText: "Giữ lại",
      type: "warning",
    });
    if (ok) setCart([]);
  };

  // --- Khách hàng ---
  const phoneValid = PHONE_REGEX.test(phone);
  const isWalkIn = phone === WALK_IN_PHONE;

  useEffect(() => {
    if (!PHONE_REGEX.test(phone) || phone === WALK_IN_PHONE) {
      setLookup({ status: "idle" });
      return undefined;
    }
    setLookup({ status: "loading" });
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await adminOrdersApi.lookupCustomer(phone);
        if (cancelled) return;
        const d = res.data;
        if (d.found) {
          setLookup({ status: "found", name: d.recipient_name, data: d });
          // Chỉ tự điền khi nhân viên chưa tự gõ tên
          setName((current) => {
            if (d.recipient_name && (!current.trim() || nameSourceRef.current === "auto")) {
              nameSourceRef.current = "auto";
              return d.recipient_name;
            }
            return current;
          });
        } else {
          setLookup({ status: "new" });
          // Tên điền tự động của SĐT trước không còn đúng với SĐT mới
          if (nameSourceRef.current === "auto") {
            nameSourceRef.current = "user";
            setName("");
          }
        }
      } catch {
        if (!cancelled) setLookup({ status: "error" });
      }
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone]);

  const handlePhoneChange = (value) => setPhone(value.replace(/\D/g, "").slice(0, 10));

  const handleNameChange = (value) => {
    nameSourceRef.current = "user";
    setName(value);
  };

  const selectWalkIn = () => {
    nameSourceRef.current = "auto";
    setPhone(WALK_IN_PHONE);
    setName(WALK_IN_NAME);
  };

  const switchChannel = (next) => {
    if (next === channel) return;
    setChannel(next);
    // Đơn qua điện thoại luôn cần SĐT thật của người gọi: bỏ thông tin khách vãng lai đã chọn ở tab quầy
    if (next === "phone" && phone === WALK_IN_PHONE) {
      nameSourceRef.current = "user";
      setPhone("");
      setName("");
    }
  };

  // --- Voucher ---
  const voucherPhone = phoneValid ? phone : "";

  const runVoucherCheck = async (code) => {
    const seq = ++voucherSeq.current;
    const amount = subtotal;
    const forPhone = voucherPhone;
    setVoucherLoading(true);
    try {
      const res = await adminOrdersApi.checkVoucher({
        voucher_code: code,
        order_amount: amount,
        recipient_phone: forPhone || null,
      });
      if (seq !== voucherSeq.current) return;
      const d = res.data;
      setVoucher({
        code: d.promotion_code,
        name: d.promotion_name,
        discount: Number(d.discount_amount),
        subtotal: amount,
        phone: forPhone,
      });
      setVoucherInput(d.promotion_code);
      setVoucherError("");
    } catch (err) {
      if (seq !== voucherSeq.current) return;
      setVoucher(null);
      setVoucherError(apiErrorMessage(err, "Không áp dụng được mã giảm giá"));
    } finally {
      if (seq === voucherSeq.current) setVoucherLoading(false);
    }
  };

  const applyVoucher = () => {
    const code = voucherInput.trim();
    if (!code) return;
    if (subtotal <= 0) {
      setVoucherError("Chọn bánh trước khi áp dụng mã giảm giá");
      return;
    }
    runVoucherCheck(code);
  };

  const removeVoucher = () => {
    voucherSeq.current++;
    setVoucher(null);
    setVoucherError("");
    setVoucherLoading(false);
  };

  // Đơn hoặc khách đổi sau khi áp mã: tính lại mức giảm (bậc giảm và lượt dùng phụ thuộc tổng tiền & khách)
  const voucherStale = !!voucher && (voucher.subtotal !== subtotal || voucher.phone !== voucherPhone);
  useEffect(() => {
    if (!voucherStale) return undefined;
    if (subtotal <= 0) {
      removeVoucher();
      return undefined;
    }
    const timer = setTimeout(() => runVoucherCheck(voucher.code), LOOKUP_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // runVoucherCheck đọc subtotal / SĐT của lần render này nên chỉ cần chạy lại khi chúng đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherStale, subtotal, voucherPhone]);

  const discount = voucher ? Math.min(voucher.discount, subtotal) : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  // --- Loại đơn & thanh toán ---
  const isPhone = channel === "phone";
  const isImmediate = !isPhone && orderType === "immediate";
  // Giá trị order_type gửi lên server: "phone" | "immediate" | "preorder"
  const effectiveType = isPhone ? "phone" : orderType;
  // Qua điện thoại chỉ có thể đã trả trước bằng chuyển khoản / ví; tiền mặt & quẹt thẻ thu khi khách đến lấy
  const canPrepay = !isPhone || !IN_PERSON_METHODS.includes(paymentMethod);
  const prepaid = !isImmediate && preorderPaid && canPrepay;
  const willBePaid = isImmediate || prepaid;
  // Tính tiền thối chỉ khi khách đứng tại quầy đưa tiền mặt
  const showCash = !isPhone && paymentMethod === "COD" && willBePaid;
  const cashNum = showCash ? Number(cash || 0) : 0;
  const change = cashNum - finalTotal;
  const cashShort = showCash && cashNum > 0 && change < 0;

  const pickupDate = pickup ? new Date(pickup) : null;
  const pickupInvalid = !isImmediate && (!pickupDate || Number.isNaN(pickupDate.getTime()) || pickupDate.getTime() < Date.now());

  // Lý do chưa tạo được đơn (hiện lý do đầu tiên cạnh nút tạo đơn)
  const blockers = [];
  if (catalogLoading) blockers.push("Đang tải danh sách bánh...");
  if (!cart.length) blockers.push("Chọn ít nhất 1 bánh từ danh sách bên trái");
  if (lines.some((l) => !l.info)) blockers.push("Có bánh đã ngừng bán trong đơn, vui lòng xóa khỏi đơn");
  if (lines.some((l) => l.info && l.quantity > l.stock)) blockers.push("Có bánh vượt quá số lượng tồn kho");
  if (!phoneValid) blockers.push(isPhone ? "Vui lòng nhập số điện thoại người gọi" : "Vui lòng nhập số điện thoại khách");
  if (isPhone && isWalkIn) blockers.push("Đơn qua điện thoại cần SĐT thật của khách để liên hệ");
  if (!name.trim()) blockers.push("Nhập tên khách hàng");
  if (pickupInvalid) blockers.push("Chọn giờ hẹn lấy bánh sau thời điểm hiện tại");
  if (notes.trim().length > NOTES_MAX) blockers.push(`Ghi chú tối đa ${NOTES_MAX} ký tự`);
  if (voucherLoading || voucherStale) blockers.push("Đang tính lại mã giảm giá...");
  if (cashShort) blockers.push(`Khách đưa còn thiếu ${formatVND(-change)}`);

  const paymentSummary = () => {
    const method = PAYMENT_OPTIONS.find((m) => m.key === paymentMethod)?.label || paymentMethod;
    if (isImmediate) return `${method} · Đã thanh toán`;
    if (prepaid) return `${method} · Đã thanh toán trước`;
    return IN_PERSON_METHODS.includes(paymentMethod) ? `${method} khi nhận bánh` : `${method} · Chưa thanh toán`;
  };

  // Đơn điện thoại: mở bước đọc lại đơn cho khách trước; bán tại quầy: tạo ngay
  const handleSubmitClick = () => {
    if (blockers.length || submitting) return;
    if (isPhone) setConfirmOpen(true);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (blockers.length || submitting) return;
    setSubmitting(true);
    const payload = {
      recipient_name: name.trim(),
      recipient_phone: phone,
      order_type: effectiveType,
      pickup_time: isImmediate ? null : pickupDate.toISOString(),
      notes: notes.trim() || null,
      payment_method: paymentMethod,
      payment_status: willBePaid ? "Paid" : "Unpaid",
      voucher_code: voucher?.code || null,
      // Gửi kèm giá đang hiển thị để server báo nếu giá vừa đổi
      items: lines.map((l) => ({
        product_id: l.product_id,
        size_id: l.size_id,
        quantity: l.quantity,
        price: l.info.size.price,
      })),
    };
    try {
      const res = await adminOrdersApi.create(payload);
      const order = res.data;
      popup.success(`Đơn #${order.order_code} · ${formatVND(order.final_cost)}`, { title: "Tạo đơn thành công" });
      if (printAfter) {
        const received = paymentMethod === "COD" && order.payment_status === "Paid" ? cashNum : 0;
        printThermalReceipt(order, {
          cashReceived: received,
          change: Math.max(0, received - Number(order.final_cost)),
          cashier,
        });
      }
      onCreated(order);
    } catch (err) {
      popup.error(apiErrorMessage(err, "Tạo đơn hàng thất bại"));
      // Thường do tồn kho / giá vừa đổi: tải lại danh mục để nhân viên thấy số mới và báo lại khách
      loadCatalog();
      setConfirmOpen(false);
      setSubmitting(false);
    }
  };

  const requestClose = useCallback(async () => {
    if (submitting) return;
    if (cart.length) {
      const ok = await popup.confirm({
        title: "Hủy đơn đang tạo?",
        message: "Các bánh đã chọn và thông tin khách sẽ không được lưu.",
        confirmText: "Hủy đơn",
        cancelText: "Tiếp tục tạo đơn",
        type: "danger",
      });
      if (!ok) return;
    }
    onClose();
  }, [cart.length, submitting, onClose]);

  // Esc đóng modal (nhường cho hộp thoại xác nhận nếu đang mở)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape" || usePopupStore.getState().dialog.isOpen) return;
      e.preventDefault();
      // Hộp xác nhận mở ngay trong lượt sự kiện này và gắn listener Esc lên window;
      // không chặn lại thì chính phím Esc này nổi lên window và đóng luôn hộp xác nhận
      e.stopPropagation();
      // Đang ở bước đọc lại đơn: Esc chỉ quay lại sửa đơn
      if (confirmOpen) {
        if (!submitting) setConfirmOpen(false);
        return;
      }
      requestClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose, confirmOpen, submitting]);

  const togglePrint = (checked) => {
    setPrintAfter(checked);
    writePrintPref(checked);
  };

  const renderCustomerStatus = () => {
    if (isWalkIn) {
      if (isPhone) {
        return <span className="pos-lookup-hint is-error">Đơn qua điện thoại cần SĐT thật của khách để liên hệ.</span>;
      }
      return (
        <span className="pos-badge is-gray">
          <ion-icon name="walk-outline"></ion-icon> Khách lẻ vãng lai
        </span>
      );
    }
    switch (lookup.status) {
      case "loading":
        return (
          <span className="pos-lookup-hint">
            <span className="pos-spinner" aria-hidden="true"></span> Đang tra cứu khách hàng...
          </span>
        );
      case "found": {
        const d = lookup.data || {};
        return (
          <div className="pos-customer-found">
            <span className="pos-badge is-info" title={lookup.name}>
              <ion-icon name="person-circle-outline"></ion-icon> Đã có hồ sơ khách
              {lookup.name && lookup.name !== name.trim() && (
                <button
                  type="button"
                  className="pos-link-btn"
                  onClick={() => {
                    nameSourceRef.current = "auto";
                    setName(lookup.name);
                  }}
                >
                  Dùng tên “{lookup.name}”
                </button>
              )}
            </span>
            {d.is_locked && (
              <p className="pos-alert is-danger" role="alert">
                <ion-icon name="alert-circle"></ion-icon>
                <span>
                  <strong>Tài khoản đang bị khóa</strong>
                  {d.lock_reason ? ` — ${d.lock_reason}` : ""}. Cân nhắc yêu cầu khách chuyển khoản trước.
                </span>
              </p>
            )}
            {d.active_order_count > 0 && (
              <p className="pos-alert is-warning" role="note">
                <ion-icon name="information-circle"></ion-icon>
                <span>
                  Khách đang có <strong>{d.active_order_count} đơn chưa hoàn tất</strong>. Hỏi lại khách có phải gọi để
                  sửa / hỏi đơn cũ không, tránh tạo trùng đơn.
                </span>
              </p>
            )}
          </div>
        );
      }
      case "new":
        return (
          <span className="pos-badge is-mint">
            <ion-icon name="person-add-outline"></ion-icon> Khách mới
          </span>
        );
      case "error":
        return <span className="pos-lookup-hint is-error">Không tra cứu được khách hàng, vẫn có thể tạo đơn.</span>;
      default:
        return phone && !phoneValid ? <span className="pos-lookup-hint">SĐT gồm 10 chữ số, bắt đầu bằng 0</span> : null;
    }
  };

  const customerSection = (
    <div className="pos-section">
      <div className="pos-section-head">
        <h3 className="pos-section-title">{isPhone ? "Khách gọi đặt bánh" : "Khách hàng"}</h3>
        {!isPhone && (
          <button type="button" className="pos-chip" onClick={selectWalkIn} disabled={isWalkIn}>
            <ion-icon name="walk-outline"></ion-icon> Khách lẻ vãng lai
          </button>
        )}
      </div>
      <div className="pos-field-row">
        <label className="pos-field">
          <span className="pos-label">{isPhone ? "SĐT người gọi" : "Số điện thoại"}</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            placeholder="09xx xxx xxx"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={(phone && !phoneValid) || (isPhone && isWalkIn) ? "is-invalid" : ""}
          />
        </label>
        <label className="pos-field">
          <span className="pos-label">Tên khách</span>
          <input
            type="text"
            autoComplete="off"
            maxLength={100}
            placeholder="Họ và tên"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </label>
      </div>
      <div className="pos-customer-status" aria-live="polite">{renderCustomerStatus()}</div>
    </div>
  );

  return (
    <div
      className="pos-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="pos-modal" role="dialog" aria-modal="true" aria-labelledby="pos-title">
        <header className="pos-header">
          <div>
            <span className="pos-eyebrow">{CHANNELS.find((c) => c.key === channel).eyebrow}</span>
            <h2 id="pos-title" className="pos-title">Tạo Đơn Hàng Mới</h2>
          </div>
          <div className="pos-channel-tabs" role="tablist" aria-label="Kênh tạo đơn">
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={channel === c.key}
                className={channel === c.key ? "is-active" : ""}
                onClick={() => switchChannel(c.key)}
                disabled={submitting}
              >
                <ion-icon name={c.icon}></ion-icon>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="pos-icon-btn" onClick={requestClose} aria-label="Đóng (Esc)" title="Đóng (Esc)">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </header>

        <div className="pos-body">
          {/* ===== Cột trái: chọn bánh ===== */}
          <section className="pos-catalog" aria-label="Danh sách bánh">
            <div className="pos-catalog-toolbar">
              <div className="pos-search">
                <ion-icon name="search-outline"></ion-icon>
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Tìm bánh theo tên..."
                  aria-label="Tìm bánh theo tên"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" className="pos-search-clear" aria-label="Xóa tìm kiếm" onClick={() => setSearch("")}>
                    <ion-icon name="close-circle"></ion-icon>
                  </button>
                )}
              </div>
              {categories.length > 1 && (
                <div className="pos-chips" role="tablist" aria-label="Lọc theo danh mục">
                  {["all", ...categories].map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="tab"
                      aria-selected={category === c}
                      className={`pos-chip ${category === c ? "is-active" : ""}`}
                      onClick={() => setCategory(c)}
                    >
                      {c === "all" ? "Tất cả" : c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pos-product-grid">
              {catalogLoading &&
                [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="pos-product-card is-skeleton" aria-hidden="true" />)}

              {!catalogLoading && catalogError && (
                <div className="pos-empty">
                  <ion-icon name="cloud-offline-outline"></ion-icon>
                  <p>{catalogError}</p>
                  <button type="button" className="btn-pill-outline" onClick={() => { setCatalogLoading(true); loadCatalog(); }}>
                    Thử lại
                  </button>
                </div>
              )}

              {!catalogLoading && !catalogError && visibleProducts.length === 0 && (
                <div className="pos-empty">
                  <ion-icon name="search-outline"></ion-icon>
                  <p>{catalog.length ? `Không có bánh nào khớp "${search.trim()}"` : "Chưa có bánh nào đang bán"}</p>
                </div>
              )}

              {!catalogLoading &&
                visibleProducts.map((p) => {
                  const inCart = p.sizes.reduce((sum, s) => sum + (qtyInCart.get(lineKey(p.product_id, s.size_id)) || 0), 0);
                  const soldOut = p.sizes.every((s) => (Number(s.stock_quantity) || 0) <= 0);
                  return (
                    <article key={p.product_id} className={`pos-product-card ${soldOut ? "is-soldout" : ""}`}>
                      <div className="pos-product-top">
                        <img src={imageUrl(p.image)} alt="" className="pos-product-img" loading="lazy" />
                        <div className="pos-product-info">
                          <h3 className="pos-product-name" title={p.product_name}>{p.product_name}</h3>
                          {p.category_name && <span className="pos-product-cat">{p.category_name}</span>}
                        </div>
                        {inCart > 0 && <span className="pos-product-count" aria-label={`${inCart} trong đơn`}>{inCart}</span>}
                      </div>
                      <div className="pos-size-list">
                        {p.sizes.map((s) => {
                          const k = lineKey(p.product_id, s.size_id);
                          const left = (Number(s.stock_quantity) || 0) - (qtyInCart.get(k) || 0);
                          return (
                            <button
                              key={s.size_id}
                              type="button"
                              className="pos-size-btn"
                              disabled={left <= 0}
                              onClick={() => addToCart(p, s)}
                              title={left > 0 ? `Thêm 1 ${p.product_name} (${s.size_name})` : "Hết hàng"}
                            >
                              <span className="pos-size-name">{s.size_name}</span>
                              <span className="pos-size-price">{formatVND(s.price)}</span>
                              <span className={`pos-size-stock ${left <= 0 ? "is-out" : left <= 3 ? "is-low" : ""}`}>
                                {left <= 0 ? "Hết hàng" : `Còn ${left}`}
                              </span>
                            </button>
                          );
                        })}
                        {p.sizes.length === 0 && <span className="pos-size-stock is-out">Chưa có kích cỡ</span>}
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>

          {/* ===== Cột phải: chi tiết đơn & thanh toán ===== */}
          <section className="pos-checkout" aria-label="Chi tiết đơn hàng">
            <div className="pos-checkout-scroll">
              {/* Đơn điện thoại: hỏi SĐT người gọi trước để tra cứu khách */}
              {isPhone && customerSection}

              {/* Món đã chọn */}
              <div className="pos-section">
                <div className="pos-section-head">
                  <h3 className="pos-section-title">
                    Món đã chọn {totalQty > 0 && <span className="pos-count-pill">{totalQty}</span>}
                  </h3>
                  {cart.length > 0 && (
                    <button type="button" className="pos-link-btn is-danger" onClick={clearCart}>
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="pos-cart-empty">
                    <ion-icon name="basket-outline"></ion-icon>
                    <span>Bấm vào size bánh bên trái để thêm vào đơn</span>
                  </div>
                ) : (
                  <ul className="pos-cart">
                    {lines.map((l) => {
                      const k = lineKey(l.product_id, l.size_id);
                      const over = l.info && l.quantity > l.stock;
                      return (
                        <li key={k} className={`pos-cart-line ${!l.info || over ? "has-error" : ""}`}>
                          <div className="pos-cart-info">
                            <div className="pos-cart-name">{l.product_name}</div>
                            <div className="pos-cart-meta">
                              {l.size_name} · {l.info ? formatVND(l.price) : "Ngừng bán"}
                              {over && <span className="pos-cart-warn"> · chỉ còn {l.stock}</span>}
                            </div>
                          </div>
                          <div className="pos-stepper" role="group" aria-label={`Số lượng ${l.product_name}`}>
                            <button type="button" onClick={() => setLineQty(k, l.quantity - 1)} aria-label="Giảm 1">
                              <ion-icon name="remove-outline"></ion-icon>
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={l.quantity}
                              aria-label="Số lượng"
                              onChange={(e) => {
                                const v = Number(e.target.value.replace(/\D/g, "").slice(0, 3));
                                if (v > 0) setLineQty(k, v);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setLineQty(k, l.quantity + 1)}
                              disabled={!l.info || l.quantity >= l.stock}
                              aria-label="Tăng 1"
                            >
                              <ion-icon name="add-outline"></ion-icon>
                            </button>
                          </div>
                          <span className="pos-cart-total">{formatVND(l.total)}</span>
                          <button type="button" className="pos-icon-btn is-small" onClick={() => removeLine(k)} aria-label={`Xóa ${l.product_name}`}>
                            <ion-icon name="trash-outline"></ion-icon>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {!isPhone && customerSection}

              {/* Loại đơn */}
              <div className="pos-section">
                <h3 className="pos-section-title">{isPhone ? "Hẹn lấy bánh" : "Hình thức nhận bánh"}</h3>
                {!isPhone && (
                  <div className="pos-segment" role="radiogroup" aria-label="Hình thức nhận bánh">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isImmediate}
                      className={isImmediate ? "is-active" : ""}
                      onClick={() => setOrderType("immediate")}
                    >
                      <ion-icon name="storefront-outline"></ion-icon> Lấy ngay tại quầy
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!isImmediate}
                      className={!isImmediate ? "is-active" : ""}
                      onClick={() => setOrderType("preorder")}
                    >
                      <ion-icon name="calendar-outline"></ion-icon> Hẹn giờ lấy bánh
                    </button>
                  </div>
                )}

                {isImmediate ? (
                  <p className="pos-hint">
                    <ion-icon name="information-circle-outline"></ion-icon>
                    Đơn được ghi nhận <strong>Đã thanh toán</strong> và <strong>Hoàn tất</strong> ngay khi tạo.
                  </p>
                ) : (
                  <div className="pos-pickup">
                    <label className="pos-field">
                      <span className="pos-label">Giờ hẹn lấy bánh</span>
                      <input
                        type="datetime-local"
                        value={pickup}
                        min={toLocalInput(new Date())}
                        onChange={(e) => setPickup(e.target.value)}
                        className={pickupInvalid ? "is-invalid" : ""}
                      />
                    </label>
                    <div className="pos-chips">
                      {PICKUP_PRESETS.map((p) => (
                        <button key={p.label} type="button" className="pos-chip" onClick={() => setPickup(toLocalInput(p.at()))}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="pos-field">
                  <span className="pos-label">
                    Ghi chú <span className="pos-label-meta">{notes.trim().length}/{NOTES_MAX}</span>
                  </span>
                  <textarea
                    rows={2}
                    maxLength={NOTES_MAX + 50}
                    placeholder="VD: Ghi chữ lên bánh, thêm nến..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={notes.trim().length > NOTES_MAX ? "is-invalid" : ""}
                  />
                </label>
              </div>

              {/* Voucher */}
              <div className="pos-section">
                <h3 className="pos-section-title">Mã giảm giá</h3>
                {voucher ? (
                  <div className="pos-voucher-applied">
                    <ion-icon name="ticket-outline"></ion-icon>
                    <div className="pos-voucher-info">
                      <strong>{voucher.code}</strong>
                      <span>{voucher.name}</span>
                    </div>
                    <span className="pos-voucher-amount">
                      {voucherLoading || voucherStale ? <span className="pos-spinner" aria-label="Đang tính lại"></span> : `-${formatVND(discount)}`}
                    </span>
                    <button type="button" className="pos-icon-btn is-small" onClick={removeVoucher} aria-label="Bỏ mã giảm giá">
                      <ion-icon name="close-outline"></ion-icon>
                    </button>
                  </div>
                ) : (
                  <div className="pos-voucher-form">
                    <input
                      type="text"
                      placeholder="Nhập mã voucher"
                      value={voucherInput}
                      onChange={(e) => {
                        setVoucherInput(e.target.value.toUpperCase());
                        setVoucherError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyVoucher();
                        }
                      }}
                      className={voucherError ? "is-invalid" : ""}
                    />
                    <button
                      type="button"
                      className="btn-pill-outline"
                      onClick={applyVoucher}
                      disabled={!voucherInput.trim() || voucherLoading}
                    >
                      {voucherLoading ? "Đang kiểm tra..." : "Áp dụng"}
                    </button>
                  </div>
                )}
                {voucherError && <p className="pos-error-text">{voucherError}</p>}
              </div>

              {/* Thanh toán */}
              <div className="pos-section">
                <h3 className="pos-section-title">Thanh toán</h3>
                <div className="pos-pay-grid" role="radiogroup" aria-label="Phương thức thanh toán">
                  {PAYMENT_OPTIONS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === m.key}
                      className={`pos-pay-btn ${paymentMethod === m.key ? "is-active" : ""}`}
                      onClick={() => setPaymentMethod(m.key)}
                    >
                      <ion-icon name={m.icon}></ion-icon>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                {!isImmediate && (
                  <div className="pos-segment is-small" role="radiogroup" aria-label="Trạng thái thanh toán">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!prepaid}
                      className={!prepaid ? "is-active" : ""}
                      onClick={() => setPreorderPaid(false)}
                    >
                      {isPhone ? "Chưa thanh toán" : "Thu tiền khi nhận bánh"}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={prepaid}
                      className={prepaid ? "is-active" : ""}
                      onClick={() => setPreorderPaid(true)}
                      disabled={!canPrepay}
                      title={canPrepay ? undefined : "Tiền mặt / quẹt thẻ chỉ thu được khi khách đến nhận bánh"}
                    >
                      {isPhone ? "Khách đã chuyển khoản" : "Đã thanh toán trước"}
                    </button>
                  </div>
                )}

                {isPhone && (
                  <p className="pos-hint">
                    <ion-icon name="information-circle-outline"></ion-icon>
                    <span>
                      {!canPrepay
                        ? "Tiền mặt / quẹt thẻ: thu khi khách đến nhận bánh (bấm “Thu tiền & hoàn tất” ở chi tiết đơn)."
                        : prepaid
                          ? "Chỉ chọn khi đã thấy tiền vào tài khoản / ví của tiệm."
                          : "Khi nhận được tiền, bấm “Xác nhận đã thu” ở chi tiết đơn để đánh dấu đã thanh toán."}
                    </span>
                  </p>
                )}

                {showCash && (
                  <div className="pos-cash">
                    <label className="pos-field">
                      <span className="pos-label">Tiền khách đưa</span>
                      <div className="pos-money-input">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={cash ? Number(cash).toLocaleString("vi-VN") : ""}
                          onChange={(e) => setCash(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12))}
                          className={cashShort ? "is-invalid" : ""}
                        />
                        <span>đ</span>
                      </div>
                    </label>
                    <div className="pos-chips">
                      {cashSuggestions(finalTotal).map((v) => (
                        <button key={v} type="button" className="pos-chip" onClick={() => setCash(String(v))}>
                          {v === finalTotal ? "Đủ tiền" : formatVND(v)}
                        </button>
                      ))}
                    </div>
                    <div className={`pos-change ${cashShort ? "is-short" : cashNum > 0 ? "is-ok" : ""}`}>
                      <span>{cashShort ? "Khách còn thiếu" : "Tiền thối lại"}</span>
                      <strong>{cashNum > 0 ? formatVND(Math.abs(change)) : "—"}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tổng kết & hành động: luôn ghim ở đáy */}
            <footer className="pos-footer">
              <div className="pos-summary">
                <div className="pos-summary-row">
                  <span>Tạm tính ({totalQty} bánh)</span>
                  <span>{formatVND(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="pos-summary-row is-discount">
                    <span>Giảm giá ({voucher.code})</span>
                    <span>-{formatVND(discount)}</span>
                  </div>
                )}
                <div className="pos-summary-total">
                  <span>Tổng cộng</span>
                  <strong>{formatVND(finalTotal)}</strong>
                </div>
              </div>

              <label className="pos-print-toggle">
                <input type="checkbox" checked={printAfter} onChange={(e) => togglePrint(e.target.checked)} />
                <span>{isPhone ? "In phiếu đặt bánh (K80) sau khi tạo" : "In hóa đơn nhiệt (K80) sau khi tạo"}</span>
              </label>

              {blockers.length > 0 && cart.length > 0 && <p className="pos-blocker">{blockers[0]}</p>}

              <div className="pos-actions">
                <button type="button" className="btn-pill-outline" onClick={requestClose} disabled={submitting}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-pill-primary pos-submit"
                  onClick={handleSubmitClick}
                  disabled={blockers.length > 0 || submitting}
                  title={blockers[0]}
                >
                  {submitting ? (
                    <span className="pos-spinner is-light" aria-hidden="true"></span>
                  ) : (
                    <ion-icon name={isPhone ? "call-outline" : "checkmark-circle-outline"}></ion-icon>
                  )}
                  <span>{submitting ? "Đang tạo đơn..." : isPhone ? "Đọc Lại & Xác Nhận Đơn" : "Tạo Đơn Hàng"}</span>
                </button>
              </div>
            </footer>
          </section>
        </div>

        {/* Bước đọc lại đơn cho khách qua điện thoại trước khi chốt */}
        {confirmOpen && (
          <div className="pos-confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !submitting && setConfirmOpen(false)}>
            <div className="pos-confirm" role="alertdialog" aria-modal="true" aria-labelledby="pos-confirm-title">
              <div className="pos-confirm-head">
                <span className="pos-confirm-icon" aria-hidden="true">
                  <ion-icon name="call"></ion-icon>
                </span>
                <div>
                  <h3 id="pos-confirm-title">Xác nhận đơn hàng</h3>
                  <p>Xác nhận từng mục trước khi chốt đơn.</p>
                </div>
              </div>

              <dl className="pos-confirm-grid">
                <dt>Khách</dt>
                <dd>
                  <strong>{name.trim()}</strong> · {phone}
                </dd>
                <dt>Hẹn lấy</dt>
                <dd>
                  <strong>{pickupDate && !pickupInvalid ? formatPickupLong(pickupDate) : "—"}</strong>
                </dd>
                <dt>Thanh toán</dt>
                <dd>{paymentSummary()}</dd>
                {notes.trim() && (
                  <>
                    <dt>Ghi chú</dt>
                    <dd>{notes.trim()}</dd>
                  </>
                )}
              </dl>

              <ul className="pos-confirm-items">
                {lines.map((l) => (
                  <li key={lineKey(l.product_id, l.size_id)}>
                    <span className="pos-confirm-qty">{l.quantity}x</span>
                    <span className="pos-confirm-name">
                      {l.product_name} <span>({l.size_name})</span>
                    </span>
                    <span>{formatVND(l.total)}</span>
                  </li>
                ))}
              </ul>

              <div className="pos-confirm-total">
                {discount > 0 && (
                  <div className="pos-summary-row is-discount">
                    <span>Giảm giá ({voucher.code})</span>
                    <span>-{formatVND(discount)}</span>
                  </div>
                )}
                <div className="pos-summary-total">
                  <span>Tổng cộng ({totalQty} bánh)</span>
                  <strong>{formatVND(finalTotal)}</strong>
                </div>
              </div>

              {lookup.status === "found" && lookup.data?.is_locked && (
                <p className="pos-alert is-danger">
                  <ion-icon name="alert-circle"></ion-icon>
                  <span>Tài khoản khách đang bị khóa{lookup.data.lock_reason ? ` — ${lookup.data.lock_reason}` : ""}.</span>
                </p>
              )}

              {/* Tồn kho / giờ hẹn có thể đổi trong lúc đang đọc lại đơn (realtime) */}
              {blockers.length > 0 && <p className="pos-blocker">{blockers[0]}</p>}

              <div className="pos-actions">
                <button type="button" className="btn-pill-outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                  Quay lại sửa
                </button>
                <button
                  type="button"
                  className="btn-pill-primary pos-submit"
                  onClick={handleSubmit}
                  disabled={submitting || blockers.length > 0}
                  autoFocus
                >
                  {submitting ? (
                    <span className="pos-spinner is-light" aria-hidden="true"></span>
                  ) : (
                    <ion-icon name="checkmark-done-outline"></ion-icon>
                  )}
                  <span>{submitting ? "Đang tạo đơn..." : "Tạo Đơn hàng"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
